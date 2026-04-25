import * as dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
async function gen() {
    const secret = process.env.JWT_SECRET || "supersecretjwtkey_change_in_production";
    const payload = {
        userId: "c7083ab6-3756-4609-890c-86758196124c", // your ID
        email: "jeremypaul0101@gmail.com"
    };
    const token = jwt.sign(payload, secret);
    console.log("--- MANUALLY GENERATED TOKEN ---");
    console.log(token);
    console.log("--------------------------------");
}
gen();
//# sourceMappingURL=gen-admin-token.js.map