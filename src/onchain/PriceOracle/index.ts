import { bool, ConstantableTermType, data, int, makeValidator, pBool, PBool, perror, pfilter, pfn, pInt, pisEmpty, plet, pmatch, punIData, Term } from "@harmoniclabs/plu-ts";
import PPubKeyHash from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/PubKey/PPubKeyHash.js";
import PScriptContext from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V2/ScriptContext/PScriptContext.js";
import PTxInInfo from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V2/Tx/PTxInInfo.js";
import PTxOut from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V2/Tx/PTxOut.js";
import PCurrencySymbol from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/Value/PCurrencySymbol.js";
import { RestrictedStructInstance } from "@harmoniclabs/plu-ts/dist/onchain/pluts/PTypes/PStruct/pstruct.js";
import { UtilityTermOf } from "@harmoniclabs/plu-ts/dist/onchain/pluts/stdlib/UtilityTerms/addUtilityForType.js";
import pfindTxInByTxOutRef from "../utils/plu-ts/ctx/pfindTxInByTxOut.js";

const priceOracle = pfn([
    PPubKeyHash.type,
    PCurrencySymbol.type,
    int,
    data,
    PScriptContext.type
],  bool)
(( owner, threadIdSym, price, _rdmr, _ctx ) =>
    _ctx.extract("txInfo","purpose").in( ctx =>
    ctx.txInfo.extract("signatories","inputs","outputs").in( tx =>
        
        // tx signed by owner
        tx.signatories.some( signer => signer.eq( owner ) )
        .and(

            pmatch( ctx.purpose )
            .onSpending(_ => _.extract("utxoRef").in(({ utxoRef: spendingUtxo }) =>

                pmatch( pfindTxInByTxOutRef.$( spendingUtxo ).$( tx.inputs ) )
                .onJust( _ => _.extract("val").in((({ val: ownInput } : { val: UtilityTermOf<typeof PTxInInfo>}) =>
                    
                    ownInput.extract("resolved").in( ({ resolved }) =>
                        resolved.extract("value","address").in( ({ value, address: ownAddr } ) =>

                            value.some( valueEntry => valueEntry.fst.eq(threadIdSym) )
                            .and(

                                ownAddr.extract("credential").in(({ credential: ownCredential }) =>
                                    
                                    pmatch( ownCredential )
                                    .onPScriptCredential( _scriptCred => _scriptCred.extract("valHash").in( ({ valHash: ownHash }) => 
        
                                        plet(
        
                                            pfilter( PTxOut.type )
                                            .$( txOut => txOut.extract("address").in( ({ address }) =>
        
                                                address.extract("credential").in( ({ credential }) =>
                                                    pmatch( credential )
                                                    .onPScriptCredential( _scriptCred =>
                                                        
                                                        _scriptCred.extract("valHash").in(({ valHash }) =>
                                                            valHash.eq( ownHash )
                                                        )
                                                    )
                                                    .onPPubKeyCredential( _ => pBool( false ) )
                                                )
                                                
                                            ))
                                            .$( tx.outputs )
        
                                        ).in( outputsToSelf =>
                                            
                                            pisEmpty.$( outputsToSelf.tail )
                                            .and(
                                                plet( outputsToSelf.head ).in( ((outputToSelf: UtilityTermOf<typeof PTxOut>) =>
                                                outputToSelf.extract("datum","value").in(({ datum: outDatum, value: outValue }) => 
        
                                                outValue.some( valueEntry => valueEntry.fst.eq( threadIdSym ) )
                                                .and(

                                                    pmatch( outDatum )
                                                    .onInlineDatum( _datum => _datum.extract("datum").in(({ datum }) =>
                                                        // the price is greather than 0
                                                        pInt(0).lt( punIData.$( datum ) )
                                                        
                                                    ))
                                                    ._( _ => perror( bool ) )

                                                )
        
                                                )) as any )
                                            )
                                        )
                                    ))
                                    .onPPubKeyCredential( _ => perror( bool ) )
                                )
                                
                            )

                        )
                    )
                
                ) as any as (extracted: RestrictedStructInstance<{ val: ConstantableTermType; }, ["val"]>) => Term<PBool> ))
                .onNothing( _ => perror( bool ) )

            ))
            ._( _ => perror( bool ) )

        )
    ))
)

export default function makePriceOracle(
    owner: Term<typeof PPubKeyHash>,
    threadIdSym: Term<typeof PCurrencySymbol>
){
    return makeValidator(
        priceOracle
        .$( owner )
        .$( threadIdSym )
    )
}