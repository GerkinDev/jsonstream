import { Duplex, Readable, Pipe, ReadableOptions } from "stream";

const serializer = (source: unknown) => {
  const cache = new WeakSet();

  const addToCache = (value: object) => {
    if (cache.has(value)) {
      throw new Error("Circular dependency detected");
    }
    cache.add(value);
  };

  function* yieldSerialize(
    value: unknown,
    isInArray = false,
  ): Generator<string> {
    switch (typeof value) {
      case "string":
        yield JSON.stringify(value);
        break;

      case "number":
      case "boolean":
        yield JSON.stringify(value);
        break;

      case "symbol":
        if (isInArray) {
          yield "null";
        }
        break;

      default: {
        if (value === null) {
          yield "null";
        } else if (Array.isArray(value)) {
          addToCache(value);
          yield "[";
          let first = true;
          for (const item of value) {
            if (!first) {
              yield ",";
            }
            first = false;
            yield* yieldSerialize(item, true);
          }
          yield "]";
          cache.delete(value);
        } else if (value === undefined && isInArray) {
          yield "null";
        } else if (value) {
          addToCache(value);
          yield "{";
          let first = true;
          for (const key of Object.keys(value)) {
            if (typeof key !== "string") {
              continue;
            }
            const kvalue = (value as any)[key];
            const valueSerialized = yieldSerialize(kvalue);
            const firstIter = valueSerialized.next();
            if (firstIter.done) {
              continue;
            }

            if (!first) {
              yield ",";
            }
            first = false;
            yield* yieldSerialize(key);
            yield ":";
            yield firstIter.value;
            yield* valueSerialized;
          }
          yield "}";
          cache.delete(value);
        }
      }
    }
  }

  return yieldSerialize(source);
};

export class JsonStream extends Readable {
  private _serializeIter;

  public constructor(
    public readonly data: unknown,
    options?: ReadableOptions,
  ) {
    super(options);
    this._serializeIter = serializer(data);
  }

  // eslint-disable-next-line no-underscore-dangle
  override _read(requestedSize: number): void {
    let readSize = 0;
    while (readSize < requestedSize) {
      const { value: token, done } = this._serializeIter.next();
      if (done) {
        break;
      }
      if (!this.push(token)) {
        return;
      }
      readSize += token.length;
      if (readSize > requestedSize) {
        return;
      }
    }
    this.push(null);
  }
}

export const serialize = (data: unknown): Readable => {
  const stream = new JsonStream(data);
  return stream;
};
