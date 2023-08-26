import h from "hasard";

const generateRandom = () => {
  const randomInteger = h.integer({ type: "poisson", lambda: 4 });

  const randomString = h.string({
    size: h.add(randomInteger, 5),
    value: h.value('abcdefghijklmnopkrstuvw\n\\"`'.split("")),
  });

  const randomNumber = h.number([-99999, 99999]);

  const randomKeys = h.array({
    size: randomInteger,
    value: randomString,
  });

  // we first define it, to use it as reference into randomObject
  const randomValue = h.value();

  const randomObject = h.object(randomKeys, randomValue);

  // And we set recursivity by setting his values afterward
  randomValue.set([randomString, randomObject, randomNumber, randomInteger]);
  return randomValue.runOnce();
};

export default generateRandom;
