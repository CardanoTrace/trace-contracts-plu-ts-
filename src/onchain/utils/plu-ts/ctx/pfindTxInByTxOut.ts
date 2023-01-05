import { lam, list, pfind, phoist, plam, PMaybe, pserialiseData, ptrace } from "@harmoniclabs/plu-ts";
import PTxOutRef from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/Tx/PTxOutRef.js";
import PTxInInfo from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V2/Tx/PTxInInfo.js";
import peqUtxoRef from "./peqUtxoRef";

const pfindTxInByTxOutRef = phoist(
    plam(
        PTxOutRef.type,
        lam(
            list( PTxInInfo.type ),
            PMaybe( PTxInInfo.type ).type
        )
    )( utxoRef =>
        pfind( PTxInInfo.type )
        .$(
            txInfo => txInfo.extract("utxoRef").in( txInfo => 
                peqUtxoRef.$( utxoRef ).$( txInfo.utxoRef )
            )
        )
    )
)

export default pfindTxInByTxOutRef;