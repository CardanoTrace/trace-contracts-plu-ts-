import cli from "../cli";

export default function initAddressUtxos( addr: string, skeyPath: string, nUtxos: number = 4 )
{
    if( nUtxos < 2 ) return;
    
    const utxos = cli.queryUtxo( addr );

    if( utxos.length == 0 ) throw "fuck no utxos";
    if( utxos.length >= nUtxos ) return;

    const utxo = utxos[0];

    console.log( utxo.value );

    const lovelaces = Math.floor( (utxo.value.lovelace ?? 0)/ nUtxos );
    const lastLovelace = lovelaces + (utxo.value.lovelace - lovelaces * nUtxos)

    const txBody = cli.transactionBuild({
        txIn: [
            {
                txHash: utxo.txHash,
                txId: utxo.txId.toString(),
            }
        ],
        txOut: (new Array( nUtxos - 1 )).fill(0).map((_, i) => ({
            address: addr,
            value: {
                lovelace: i === (nUtxos - 1) ? lovelaces : lastLovelace
            }
        })),
        changeAddress: addr
    });

    const tx = cli.transactionSign({
        txBody,
        signingKeys: [
            skeyPath
        ]
    });

    return cli.transactionSubmit(tx)
}