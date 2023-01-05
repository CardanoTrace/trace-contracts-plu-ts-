import { data, perror, pfn, pif, pisEmpty, plet, pmakeUnit, V2, unit, Term, ptraceError, pBool, bool, ptraceIfFalse } from "@harmoniclabs/plu-ts";
import pisUtxoSpent from "../utils/plu-ts/ctx/pisUtxoSpent";
import { compile, pByteString, pInt,  } from "@harmoniclabs/plu-ts";
import PTxId from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/Tx/PTxId.js";
import PTxOutRef from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/Tx/PTxOutRef.js";
import { PlutusScriptVersion, scriptToJsonFormat } from "@harmoniclabs/plu-ts/dist/onchain/pluts/Script/compile.js";
import pmatch from "@harmoniclabs/plu-ts/dist/onchain/pluts/PTypes/PStruct/pmatch.js";


const oneShotPolicy = pfn([
    V2.PTxOutRef.type,
    data,
    V2.PScriptContext.type
],  unit)
(( mustSpendUtxo, _rdmr, _ctx ) => 
    _ctx.extract("txInfo","purpose").in( ctx =>
    ctx.txInfo.extract("inputs","mint").in( tx =>

        pif( unit ).$(

            ptraceIfFalse.$("not spent").$(
                pisUtxoSpent.$( mustSpendUtxo ).$( tx.inputs )
            )
            .and(
                tx.mint.head.fst.eq("")
            )
            .and(
                
                pmatch( ctx.purpose )
                .onMinting( _ => _.extract("currencySym").in( ({ currencySym: ownPolicyId }) =>
                    
                ptraceIfFalse.$("no mint match")
                .$(
                    tx.mint.some( mintEntry =>
                        // own policy
                        mintEntry.fst.eq( ownPolicyId )
                        .and(
                            
                            // list( pair(tokenName, quantity) )
                            mintEntry.snd
                            // first entry (generally unique)
                            .head
                            // quantity === 1
                            .snd.eq( 1 )

                        )
                    )
                )

                ))
                ._ ( _ => ptraceError( bool ).$("not minting") )
            )
        
        )
        .then( pmakeUnit() )
        .else( perror( unit ) )

    ))
);

export default oneShotPolicy;

export const compiledOneShotPolicy = ( utxo: Term<typeof PTxOutRef> ) => compile(
    oneShotPolicy.$( utxo )
);

export const oneShotPolicyJsonFormat = ( utxo: Term<typeof PTxOutRef>, utxoStr: string = "" ) => scriptToJsonFormat(
    compiledOneShotPolicy( utxo ),
    PlutusScriptVersion.V2,
    "oneShotPolicy @ "+ utxoStr
);