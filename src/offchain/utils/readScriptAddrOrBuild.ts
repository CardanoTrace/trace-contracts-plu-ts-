import cli from "../cli";
import fs from "fs";

export default function readScriptAddrOrBuild(
    path: string,
    jsonFormatScript: object
) : string
{
    let addr: string;
    try {
        addr = fs.readFileSync(path).toString("utf8");
    } catch( e ) {
        console.log( e );

        addr = cli.addressBuildScript(jsonFormatScript);
        fs.writeFileSync(path, addr);
    }
    return addr;
}