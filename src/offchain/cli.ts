import CardanocliJs from "cardanocli-js";

const cli = new CardanocliJs({
    shelleyGenesisPath: "/media/michele/Data1/cardano/testnet/node/config_files/shelley-genesis.json",
    network: "testnet-magic 42",
    cliPath: "/usr/local/bin/cardano-cli",
    dir: process.cwd(),
    socketPath: "/media/michele/Data1/cardano/cardano-private-testnet-setup/private-testnet/node-spo1/node.sock"
});

export default cli;