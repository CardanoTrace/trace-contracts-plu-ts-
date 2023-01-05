import { ByteString, pByteString, pInt } from "@harmoniclabs/plu-ts";
import PTxId from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/Tx/PTxId.js";
import PTxOutRef from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/Tx/PTxOutRef.js";
import { oneShotPolicyJsonFormat } from "../../onchain/oneShotPolicy";
import cli from "../cli";
import findCollateral from "./findCollateral";
import readPolicyIdOrBuild from "./readPolicyIdOrBuild";

export default function mintUniqueNFT( addr: string, addrSkeyFilePath: string , tokenName: string = "NFT" )
{
    const [ utxo, ...utxos ] = cli.queryUtxo( addr );

    const collateral = findCollateral( utxos );
    if( collateral === undefined )  throw "fuck 2"

    const utxoTerm = PTxOutRef.PTxOutRef({
        id: PTxId.PTxId({
            txId: pByteString(Buffer.from(utxo.txHash, "hex"))
        }),
        index: pInt( utxo.txId ) 
    })

    const onShotPolicyJson = oneShotPolicyJsonFormat( utxoTerm, utxo.txHash + '#' + utxo.txId.toString() );

    /*
    readPolicyIdOrBuild(
        process.cwd() + "/addresses/oneShot.policy",
        onShotPolicyJson
    );
    //*/
    
    const oneShotPolicyId = cli.transactionPolicyid( onShotPolicyJson );

    const assetName = `${oneShotPolicyId}.${ByteString.fromAscii(tokenName).asString}`;

    const txBody = cli.transactionBuild({
        mint: [
            {
                action: "mint",
                asset: assetName,
                quantity: "1",
                script: onShotPolicyJson,
                redeemer: {
                    constr: 0,
                    fields: []
                }
            }
        ],
        txIn: [
            {
                txHash: utxo.txHash,
                txId: utxo.txId.toString(),
            },
            ...utxos.map( input => {
                return {
                    txHash: input.txHash,
                    txId: input.txId.toString()
                }
            })
        ],
        txOut: [
            {
                address: addr,
                value: {
                    ...utxo.value,
                    [assetName]: 1
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
            addrSkeyFilePath
        ]
    });

    cli.transactionSubmit(tx);

    return oneShotPolicyId;
}