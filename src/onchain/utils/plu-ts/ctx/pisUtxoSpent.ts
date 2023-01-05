import { bool, lam, list, pcompose, phoist, pisJust, plam, ptraceIfFalse } from "@harmoniclabs/plu-ts";
import PTxOutRef from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/Tx/PTxOutRef.js";
import PTxInInfo from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V2/Tx/PTxInInfo.js";
import pfindTxInByTxOutRef from "./pfindTxInByTxOut";

const pisUtxoSpent = phoist(
    plam(
        PTxOutRef.type,
        lam(
            list( PTxInInfo.type ),
            bool
        )
    )( utxo =>
        pcompose
        .$( pisJust )
        .$(
            // any here is just fine; the type error is
            //
            // Type 'PStruct<{ Just: { val: ConstantableTermType; }; Nothing: {}; }>' is not assignable to type 'PMaybeT<PType>
            // which we know is the same exact type
            pfindTxInByTxOutRef.$( utxo ) as any
        )
    )
);

export default pisUtxoSpent;