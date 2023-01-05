import CardanocliJs from "cardanocli-js";

export default function findCollateral( _utxos: {
    txHash: string,
    txId: number,
    value: any
  }[] )
{
    return _utxos.find( ({ value }) => value !== undefined && Object.keys( value ).length === 1 && value.lovelace !== undefined )
}