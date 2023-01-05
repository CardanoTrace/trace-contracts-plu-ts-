import { bool, bs, ByteString, data, pand, PBool, pBSToData, PByteString, pByteString, pdelay, perror, pfn, PInt, pisEmpty, plet, PList, pmatch, PPair, ptraceIfFalse, punBData, punIData, Term } from "@harmoniclabs/plu-ts";
import PPubKeyHash from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/PubKey/PPubKeyHash";
import PCurrencySymbol from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/Value/PCurrencySymbol";
import PScriptContext from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V2/ScriptContext/PScriptContext.js";
import { RestrictedStructInstance } from "@harmoniclabs/plu-ts/dist/onchain/pluts/PTypes/PStruct/pstruct.js";
import TermPair from "@harmoniclabs/plu-ts/dist/onchain/pluts/stdlib/UtilityTerms/TermPair.js";
import Type, { ConstantableTermType } from "@harmoniclabs/plu-ts/dist/onchain/pluts/Term/Type/base.js";
import pintToBS from "../utils/plu-ts/int/toBS";

const nftPolicy = pfn([

    Type.Data.BS, // owner public key hash

    Type.Data.BS, // counter thread identifier policy
    Type.Data.BS, // price oracle thread identifier policy
    
    data,
    PScriptContext.type

],  bool)
(( ownerPkh, counterValId, priceOracleId, _rdmr, _ctx ) =>
    _ctx.extract("txInfo","purpose").in( ctx =>
    
    pmatch( ctx.purpose )
    .onMinting( _ => _.extract("currencySym").in( ({ currencySym: ownCurrSym }) =>

    ctx.txInfo.extract("inputs","outputs","mint","refInputs").in( tx =>
        
        ptraceIfFalse.$("inputs")
        .$( tx.inputs.some( _txIn =>
            _txIn.extract("resolved").in( ({ resolved }) =>
            resolved.extract("value","datum").in( ({ value: inputValue, datum: _nftCounter }) =>

                // includes the **verified** input of the counter
                // since the token that verifies the utxo is unique
                // it makes no sense to check for the validator hash too
                inputValue.some( policy => policy.fst.eq( punBData.$( counterValId ) ) )

                // and delays the computation; in this case is not a detail
                // because otherwhise it would have ran for each element of the list
                .and(
                    
                    pmatch( _nftCounter )
                    .onInlineDatum( _ => _.extract("datum").in( ({ datum: nftCounter }) =>

                        // checks the mint with `ownCurrSym` as policy,
                        // must have:
                        // - `Producer#<nftCounter>` as asset name
                        // - and `1` as quantity

                        tx.mint.some( entry =>
                            entry.fst.eq( ownCurrSym )
                            .and(
                                plet( entry.snd ).in( assets =>
                                    pisEmpty.$( assets.tail )
                                    .and(
                                        plet( assets.head ).in( asset =>
                                            
                                            // `1` as quantity
                                            asset.snd.eq( 1 )
                                            .and(

                                                // `Producer#<nftCounter>` as asset name
                                                asset.fst.eq(
                                                    pByteString(
                                                        ByteString.fromAscii(
                                                            "Producer#"
                                                        )
                                                    ).concat(
                                                        pintToBS.$( punIData.$( nftCounter ) )
                                                    )
                                                )
                                            )
                                        )
                                    )
                                )
                            ) 
                        )

                    ))
                    ._( _ => perror( bool ) )

                )
            ))
        ) )
        // finally checks for the price to be paid
        .and(
            pisEmpty.$( tx.refInputs.tail )
            .and(
                tx.refInputs.head.extract("resolved").in( ({ resolved: oracleRefInput }) =>
                    oracleRefInput.extract("datum","value").in( oracle =>

                        // includes identifier
                        // safe if the token is unique (NFT)
                        oracle.value.some( valueEntry => valueEntry.fst.eq( punBData.$( priceOracleId ) ) )
                        .and(
                            
                            tx.outputs.some( output =>
                            output.extract("address","value").in( out =>
                                out.address.extract("credential").in( outAddr =>

                                    pand.$(

                                        //tx output going to owner
                                        pmatch( outAddr.credential )
                                        .onPPubKeyCredential( _ => _.extract("pkh").in( ({ pkh }) =>
                                            pkh.eq( punBData.$( ownerPkh ) ) 
                                        ))
                                        ._( _ => perror( bool ) )
                                    
                                    ).$(pdelay(
                                        
                                        pmatch(
                                            out.value.find( valueEntry =>
                                                valueEntry.fst.length.eq( 0 ) // empty bytestring (policy of ADA)
                                            )
                                        )
                                        .onJust( _ => _.extract("val").in((({val}: { val: TermPair<PByteString,PList<PPair<PByteString, PInt>>>}): Term<PBool> =>
                                            
                                            // list( pair( bs, int ) )
                                            val.snd
                                            // pair( bs, int )
                                            .at( 0 )
                                            // int ( lovelaces )
                                            .snd.gtEq(
                                                punIData.$( 
                                                    pmatch( oracle.datum )
                                                    .onInlineDatum( _ => _.extract("datum").in(({ datum }) => datum ))
                                                    ._( _ => perror( data ) )
                                                )
                                            )
                                        ) as (extracted: RestrictedStructInstance<{ val: ConstantableTermType; }, ["val"]>) => Term<PBool>))
                                        .onNothing( _ => perror( bool ) ) as Term<PBool>

                                    ))

                                )
                            ))

                        )

                    )
                )
            )
        )
    )
    
    ))
    ._( _ => perror( bool ) )
))

export default function makeProducerPolicy(
    owner: Term<typeof PPubKeyHash>,
    counterNFT: Term<typeof PCurrencySymbol>,
    priceOracleNFT: Term<typeof PCurrencySymbol>,
)
{
    return nftPolicy
    .$( pBSToData.$( owner as any ) )
    .$( pBSToData.$( counterNFT as any ) )
    .$( pBSToData.$( priceOracleNFT as any ) );
}