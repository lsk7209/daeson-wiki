import { generateKeyPairSync } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});

const publicJwk = publicKey.export({ format: "jwk" });
const privateJwk = privateKey.export({ format: "jwk" });

if (!publicJwk.x || !publicJwk.y || !privateJwk.d) {
  throw new Error("Failed to generate VAPID key material.");
}

const publicKeyBytes = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(publicJwk.x, "base64url"),
  Buffer.from(publicJwk.y, "base64url"),
]);

console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKeyBytes.toString("base64url")}`);
console.log(`VAPID_PRIVATE_KEY=${privateJwk.d}`);
