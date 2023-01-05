import { bs, ByteString, int, pByteString, phoist, plam } from "@harmoniclabs/plu-ts";

const pintToBS = phoist(
    plam( int, bs )
    (( n ) => pByteString(ByteString.fromAscii("")).prepend( n.add( 48 ) ) )
);

export default pintToBS;