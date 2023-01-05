import cli from "../cli";
import fs from "fs";
import { ScriptJsonFormat } from "@harmoniclabs/plu-ts/dist/onchain/pluts/Script/compile.js";
import Cbor from "@harmoniclabs/plu-ts/dist/cbor/Cbor/index.js";
import CborBytes from "@harmoniclabs/plu-ts/dist/cbor/CborObj/CborBytes.js";
import CborString from "@harmoniclabs/plu-ts/dist/cbor/CborString/index.js";

export default function readValidatorAddrOrBuild(
    path: string,
    jsonFormatScript: ScriptJsonFormat
) : string
{
    let addr: string;
    try {
        addr = fs.readFileSync(path).toString("utf8");
    } catch( e ) {
        console.log( e );

        addr = cli.addressBuildScript(jsonFormatScript);
        fs.writeFileSync(path, addr);
        addr = fs.readFileSync(path).toString("utf8");

    }
    return addr;
}