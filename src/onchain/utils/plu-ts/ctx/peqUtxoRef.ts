import { bool, pfn, phoist } from "@harmoniclabs/plu-ts";
import PTxOutRef from "@harmoniclabs/plu-ts/dist/onchain/pluts/API/V1/Tx/PTxOutRef.js";

const peqUtxoRef = phoist(
    pfn([
        PTxOutRef.type,
        PTxOutRef.type
    ],  bool)
    ((a,b) => 
        a.extract("id","index").in( fst =>
        b.extract("id","index").in( snd =>

            fst.index.eq( snd.index )
            .and(
                fst.id.extract("txId").in( ({ txId: fstId }) =>
                snd.id.extract("txId").in( ({ txId: sndId }) =>
                    fstId.eq( sndId )
                ))
            )

        ))
    )
);

export default peqUtxoRef;