import { bool, ConstantableTermType, data, int, makeValidator, PBool, pBool, perror, pfilter, pfn, pisEmpty, plet, pmatch, punIData, Term } from "@harmoniclabs/plu-ts";
import PCurrencySymbol from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/Value/PCurrencySymbol.js";
import PScriptContext from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V2/ScriptContext/PScriptContext.js";
import PTxInInfo from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V2/Tx/PTxInInfo.js";
import PTxOut from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V2/Tx/PTxOut.js";
import { RestrictedStructInstance } from "@harmoniclabs/plu-ts/dist/onchain/pluts/PTypes/PStruct/pstruct.js";
import compile, { PlutusScriptVersion, scriptToJsonFormat } from "@harmoniclabs/plu-ts/dist/onchain/pluts/Script/compile.js";
import { UtilityTermOf } from "@harmoniclabs/plu-ts/dist/onchain/pluts/stdlib/UtilityTerms/addUtilityForType.js";
import pfindTxInByTxOutRef from "../utils/plu-ts/ctx/pfindTxInByTxOut";


const counterValidator = pfn([
    PCurrencySymbol.type, // thread identifier symbol
    int,    // counter
    data,   // any redeemer
    PScriptContext.type
],  bool)
(( threadIdSym, counter, _rdmr, _ctx ) =>
    _ctx.extract("purpose","txInfo").in( ctx => 

    pmatch( ctx.purpose )
    .onSpending( spending => spending.extract("utxoRef").in( ({ utxoRef: spendingUtxo }) => 

        ctx.txInfo.extract("inputs","outputs").in( tx =>

            pmatch( pfindTxInByTxOutRef.$( spendingUtxo ).$( tx.inputs ) ) // maybeOwnInput
            .onJust( input => input.extract("val").in(( ({ val: ownInput }: { val: UtilityTermOf<typeof PTxInInfo>}) =>

                ownInput.extract("resolved").in( ({ resolved }) =>
                resolved.extract("value","address").in( ({ value, address: ownAddr }) => 
                    
                    // the input spent by the validator includes 
                    // **any** token from the thread identifier policy
                    // ( safe if the token minted is unique )
                    value.some( valueEntry => valueEntry.fst.eq( threadIdSym ) )
                    .and(

                        ownAddr.extract("credential").in(({ credential: ownCredential }) =>
                            
                            pmatch( ownCredential )
                            .onPScriptCredential( _scriptCred => _scriptCred.extract("valHash").in( ({ valHash: ownHash }) => 

                                plet(

                                    // only outputs going to this same validator
                                    pfilter( PTxOut.type )
                                    .$( txOut => txOut.extract("address").in( ({ address }) =>

                                        address.extract("credential").in( ({ credential }) =>
                                            pmatch( credential )
                                            .onPScriptCredential( _scriptCred => _scriptCred.extract("valHash").in(({ valHash }) =>

                                                valHash.eq( ownHash )

                                            ))
                                            .onPPubKeyCredential( _ => pBool( false ) )
                                        )
                                        
                                    ))
                                    .$( tx.outputs )

                                ).in( outputsToSelf =>

                                    // unique output to self
                                    pisEmpty.$( outputsToSelf.tail )
                                    .and(

                                        // unwrap list
                                        plet( outputsToSelf.head ).in( ((outputToSelf: UtilityTermOf<typeof PTxOut>) =>
                                        outputToSelf.extract("datum","value").in(({ datum: outDatum, value: outValue }) => 

                                            pmatch( outDatum )
                                            .onInlineDatum( _datum => _datum.extract("datum").in(({ datum }) =>
                                                
                                                // the counter is incremented
                                                punIData.$( datum ).eq( counter.add( 1 ) )
                                                .and(
                                                    // the nft is preserved
                                                    outValue.some( valueEntry => valueEntry.fst.eq( threadIdSym ) )
                                                )
                                            ))
                                            ._( _ => perror( bool ) )

                                        )) as any )
                                    )
                                )
                            ))
                            .onPPubKeyCredential( _ => perror( bool ) )
                        )
                    )

                ))

            ) as (extracted: RestrictedStructInstance<{ val: ConstantableTermType; }, ["val"]>) => Term<PBool> ))
            .onNothing(_ => perror( bool ))

        )

    ))
    ._( _ => perror( bool) )

    )

)

export default function makeCounterValidator(
    threadIdentifierSym: Term<typeof PCurrencySymbol>
){
    return makeValidator(
        counterValidator
        .$( threadIdentifierSym )
    )
}

export function counterValidatorJsonFormat(
    threadIdentifierSym: Term<typeof PCurrencySymbol>,
    policyIdStr: string = ""
){
    return scriptToJsonFormat(
        compile(
            makeCounterValidator(
                threadIdentifierSym
            )
        ),
        PlutusScriptVersion.V2,
        "counterValidator @ " + policyIdStr
    );
}