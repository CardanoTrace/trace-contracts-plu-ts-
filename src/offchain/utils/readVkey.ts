import fs from "fs";
import Cbor from "@harmoniclabs/plu-ts/dist/cbor/Cbor/index.js";
import CborString from "@harmoniclabs/plu-ts/dist/cbor/CborString/index.js";
import CborBytes from "@harmoniclabs/plu-ts/dist/cbor/CborObj/CborBytes.js";

export default function readVkey( path: string ) : string
{
    return (Cbor.parse(
        new CborString(
            JSON.parse( fs.readFileSync(path).toString("utf8") ).cborHex
        )
    ) as CborBytes).buffer.toString("hex");
}