import { mkdtemp, readFile } from "fs/promises";
import { resolve } from "path";
import { createWriteStream, mkdtempSync } from "fs";
import { tmpdir } from "os";
import generateRandom from "../__tests__/random";
import { JsonStream, serialize } from "./write";

const serializeAll = async (value: unknown) => {
  const chunks = [];
  for await (const chunk of serialize(value)) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
};
const compareWithJsonStringify = async (value: unknown) => {
  expect(await serializeAll(value)).toEqual(JSON.stringify(value) ?? "");
};
const wrapArray = (value: unknown) => [value];

const SYMBOL = Symbol.for("test");
describe(serialize, () => {
  describe("Basic types", () => {
    it.each([null, [], {}, 0, "", "foo", true, false, SYMBOL].map(wrapArray))(
      "should serialize correctly %o",
      compareWithJsonStringify,
    );
  });

  describe("Object", () => {
    it.each(
      [
        { foo: 42 },
        { '"Hello"': '"world\n"' },
        { foo: "bar", baz: true, qux: 42, hello: null, bar: [] },
        { sym: SYMBOL, undef: undefined },
      ].map(wrapArray),
    )("should serialize correctly %o", compareWithJsonStringify);
  });

  describe("Array", () => {
    it.each(
      [[1], [1, "42", true, null, undefined, undefined], [SYMBOL]].map(
        wrapArray,
      ),
    )("should serialize correctly %o", compareWithJsonStringify);
  });

  describe("Random", () => {
    it.each(new Array(10).fill(0))(
      "should work with random object (%#)",
      async () => {
        const object = generateRandom();
        await compareWithJsonStringify(object);
      },
    );

    it("should work with big object", async () => {
      let object: unknown;
      let stringified: string;
      do {
        object = generateRandom();
        stringified = JSON.stringify(object);
      } while (stringified.length < 16384);
      const serialized = await serializeAll(object);

      expect(serialized.length).toEqual(stringified.length);
    });
  });

  it("should throw on circular (array)", async () => {
    const arr: unknown[] = [];
    arr.push(arr);

    expect(serializeAll(arr)).rejects.toThrowWithMessage(
      Error,
      "Circular dependency detected",
    );
  });
  it("should throw on circular (object)", async () => {
    const obj: Record<string, unknown> = {};
    obj.foo = obj;

    expect(serializeAll(obj)).rejects.toThrowWithMessage(
      Error,
      "Circular dependency detected",
    );
  });
});

describe(JsonStream, () => {
  it("should pick only the size requested", () => {
    let object: unknown;
    let stringified: string;
    do {
      object = generateRandom();
      stringified = JSON.stringify(object);
    } while (stringified.length < 100 || stringified.length > 500);
    const stream = new JsonStream(object);

    let i = 0;
    expect(stream.read(0)).toEqual(null);
    expect(stream.read(10).toString()).toEqual(stringified.slice(i, (i += 10)));
    expect(stream.read(20).toString()).toEqual(stringified.slice(i, (i += 20)));
    expect(stream.read(0)).toEqual(null);
    expect(stream.read(5).toString()).toEqual(stringified.slice(i, (i += 5)));
  });
});

const dir = mkdtempSync(resolve(tmpdir(), ".test"));
describe("Write to file", () => {
  it("should work", async () => {
    const fileName = resolve(dir, "test1.json");
    const stream = createWriteStream(fileName);
    const data = { foo: "bar" };
    const finalStream = serialize(data).pipe(stream);
    await new Promise<void>((res) => {
      finalStream.on("close", res);
    });
    expect(await readFile(fileName, "utf-8")).toEqual(JSON.stringify(data));
  });
});
