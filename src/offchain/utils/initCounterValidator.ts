import { ByteString, pByteString } from "@harmoniclabs/plu-ts";
import PCurrencySymbol from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/Value/PCurrencySymbol.js";
import { ScriptJsonFormat } from "@harmoniclabs/plu-ts/dist/onchain/pluts/Script/compile.js";
import { counterValidatorJsonFormat } from "../../onchain/counterValidator";
import cli from "../cli";
import readValidatorAddrOrBuild from "./readValidatorAddrOrBuild";

export default function initCounterValidator( addr: string, policyId: string , walletSkeyPath: string )
    : [ addr: string, json: ScriptJsonFormat ]
{
    let _utxos = cli.queryUtxo( addr );

    const collateral = _utxos.find( ({ value }) => value !== undefined && Object.keys( value ).length === 1 && value.lovelace !== undefined );
    if( collateral === undefined ) throw "fuck";

    const utxos = _utxos.filter( u => u !== collateral );

    const currSym = PCurrencySymbol.from(
        pByteString( Buffer.from( policyId,"hex" ) )
    );

    const validatorJson = counterValidatorJsonFormat( currSym, policyId );

    /*
    readValidatorAddrOrBuild(
        process.cwd() + "/addresses/counterValidator.addr",
        validatorJson
    );
    //*/

    const validatorAddr = cli.addressBuildScript( validatorJson );

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
                    int: 0
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