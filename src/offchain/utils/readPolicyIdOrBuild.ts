import cli from "../cli";
import fs from "fs";

export default function readPolicyIdOrBuild(
    path: string,
    jsonFormatScript: object
) : string
{
    let policy: string;
    try {
        policy = fs.readFileSync(path).toString("utf8");
    } catch( e ) {
        console.log( e );

        policy = cli.transactionPolicyid(jsonFormatScript);
        fs.writeFileSync(path, policy);
        policy = fs.readFileSync(path).toString("utf8");

    }
    return policy;
}