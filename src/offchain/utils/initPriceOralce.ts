import { ByteString, pByteString, Term } from "@harmoniclabs/plu-ts";
import PPubKeyHash from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/PubKey/PPubKeyHash.js";
import PCurrencySymbol from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/Value/PCurrencySymbol.js";
import compile, { PlutusScriptVersion, ScriptJsonFormat, scriptToJsonFormat } from "@harmoniclabs/plu-ts/dist/onchain/pluts/Script/compile.js";
import makePriceOracle from "../../onchain/PriceOracle";
import cli from "../cli";
import readValidatorAddrOrBuild from "./readValidatorAddrOrBuild";


export default function initPriceOracle( addr: string, owner: Term<typeof PPubKeyHash>, policyId: string , walletSkeyPath: string )
    : [ addr: string, json: ScriptJsonFormat ]
{
    const [ collateral, ...utxos ] = cli.queryUtxo( addr );

    const currSym = PCurrencySymbol.from(
        pByteString( Buffer.from( policyId,"hex" ) )
    );

    const validatorJson = scriptToJsonFormat(
        compile( makePriceOracle( owner , currSym ) ),
        PlutusScriptVersion.V2,
        policyId
    ) ;

    const validatorAddr = cli.addressBuildScript( validatorJson ); 
    /*
    readValidatorAddrOrBuild(
        process.cwd() + "/addresses/priceOracleValidator.addr",
        validatorJson
    );
    //*/

    const assetName = `${policyId}.${ByteString.fromAscii("NFT").asString}`;

    const txBody = cli.transactionBuild({
        txIn: [
            ...utxos.map( input => {
                return {
                    txHash: input.txHash,
                    txId: input.txId.toString()
                }
            })
        ],
        txOut: [
            {
                address: validatorAddr,
                value: {
                    lovelace: 5_000_000,
                    [assetName]: 1
                },
                inlineDatum: {
                    int: 5_000_000
                }
            }
        ],
        txInCollateral: [
            {
                txHash: collateral.txHash,
                txId: collateral.txId.toString()
            }
        ],
        changeAddress: addr
    });

    const tx = cli.transactionSign({
        txBody,
        signingKeys: [
            walletSkeyPath
        ]
    });

    cli.transactionSubmit(tx);

    return [ validatorAddr, validatorJson ];
}