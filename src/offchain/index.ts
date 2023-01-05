import { compile, pByteString } from "@harmoniclabs/plu-ts";
import PPubKeyHash from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/PubKey/PPubKeyHash.js";
import PCurrencySymbol from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/Value/PCurrencySymbol.js";
import { scriptToJsonFormat, PlutusScriptVersion } from "@harmoniclabs/plu-ts/dist/onchain/pluts/Script/compile.js";
import fs from "fs";
import makeProducerPolicy from "../onchain/ProducerPolicy";
import sleep from "../utils/sleep";
import cli from "./cli";
import initAddressUtxos from "./utils/initAddressUtxos";
import initCounterValidator from "./utils/initCounterValidator";
import initPriceOracle from "./utils/initPriceOralce";
import mintUniqueNFT from "./utils/mintUniqueNFT";
import readVkey from "./utils/readVkey";

const cwd = process.cwd();

const walletAddr = fs.readFileSync(cwd + "/addresses/payment1.addr").toString("utf8");

function splitUtxos( shouldSleep = true )
{
    initAddressUtxos( walletAddr, cwd + "/addresses/payment1.skey" );
    if( shouldSleep ) sleep( 2500 );    
}

splitUtxos();

const policyIdValidator = mintUniqueNFT( walletAddr, cwd + "/addresses/payment1.skey" );

splitUtxos();

const [ counterAddr, counterJson ] = initCounterValidator( walletAddr, policyIdValidator, cwd + "/addresses/payment1.skey" );

console.log( "counter validator initialized" );
//*
splitUtxos();

const policyIdPriceOracle = mintUniqueNFT( walletAddr, cwd + "/addresses/payment1.skey" );

splitUtxos();

const pubKeyStr = readVkey( cwd + "/addresses/payment1.vkey" );

console.log("read vkey done");

const owner = PPubKeyHash.from(
    pByteString( Buffer.from( pubKeyStr, "hex" ) )
);

const [ priceOracleAddr, priceOracleJson ] = initPriceOracle( walletAddr, owner , policyIdPriceOracle, cwd + "/addresses/payment1.skey" );

console.log("price oracle initialized");

//*
console.log("--- splitting utxos ---");
splitUtxos();

console.log("--- counter policy as PCurrencySymbol ---");
const counterNFTPolicy = PCurrencySymbol.from(
    pByteString( Buffer.from( policyIdValidator, "hex" ) )
);

console.log("--- price oracle policy as PCurrencySymbol ---");
const priceOracleNFTPolicy = PCurrencySymbol.from(
    pByteString( Buffer.from( policyIdPriceOracle, "hex" ) )
);

console.log("--- compiling Producer policy ---");
const ProducerPolicyJson = scriptToJsonFormat(
    compile(
        makeProducerPolicy( owner, counterNFTPolicy, priceOracleNFTPolicy )
    ),
    PlutusScriptVersion.V2,
    `ProducerPolicy @ ${pubKeyStr}, ${policyIdValidator}, ${policyIdPriceOracle}`
);
const ProducerPolicyHex = cli.transactionPolicyid( ProducerPolicyJson );

const [ counterUtxo ] = cli.queryUtxo( counterAddr );
const [ priceOracleUtxo ] = cli.queryUtxo( priceOracleAddr );

const [ collateral, ...utxos ] = cli.queryUtxo( walletAddr );

const mintedAsset = `${ProducerPolicyHex}.${Buffer.from("Producer#0","ascii").toString("hex")}`;

const mintTx = cli.transactionBuild({
    txIn: [
        ...utxos.map( u => ({
            txHash: u.txHash,
            txId: u.txId.toString()
        })),
        {
            txHash: counterUtxo.txHash,
            txId: counterUtxo.txId.toString(),
            script: counterJson,
            redeemer: { constr: 0, fields: [] },
            datum: "inline"
        }
    ],
    txOut: [
        {
            address: counterAddr,
            value: counterUtxo.value,
            inlineDatum: { int: 1 }
        },
        {
            address: walletAddr,
            value: {
                lovelace: 2_000_000,
                [mintedAsset]: 1
            }
        }
    ],
    readonlyTxInRefs: [
        {
            txHash: priceOracleUtxo.txHash,
            txId: priceOracleUtxo.txId.toString()
        }
    ],
    txInCollateral: [
        {
            txHash: collateral.txHash,
            txId: collateral.txId.toString()
        }
    ],
    mint: [
        {
            action: "mint",
            asset: mintedAsset,
            quantity: "1",
            script: ProducerPolicyJson,
            redeemer: {
                constr: 0,
                fields: []
            }
        }
    ],
    changeAddress: walletAddr
})

const signedMintTx = cli.transactionSign({
    txBody: mintTx,
    signingKeys: [
        cwd + "/addresses/payment1.skey"
    ]
});

cli.transactionSubmit( signedMintTx );
//*/