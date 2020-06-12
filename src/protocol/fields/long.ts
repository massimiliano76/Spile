import { FieldCodecBuilder } from "../field_codec.ts";

const MAX_LONG = 9223372036854775807n;
const MIN_LONG = -9223372036854775808n;

export const long = new FieldCodecBuilder<bigint>("long")
  .validate((value) => value >= MIN_LONG && value <= MAX_LONG)
  .encode((value) => {
    const bytes = new Uint8Array(8);
    const view = new DataView(bytes);
    view.setBigInt64(0, value);

    return bytes;
  })
  .decode(async (consumer) => {
    const [offset, view] = await consumer.readWithView(8);
    return view.getBigInt64(offset);
  })
  .compile();
