// @ts-check

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const TEMPLATE = /* html */ `
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BGW Scripts</title>
        <style>
            .list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            button {
                padding: 1rem;
            }
        </style>
    </head>
    <body>
        <div class="list">
            INSERT_SCRIPT_BUTTONS_HERE
        </div>
        <script defer>
            async function copyToClipboard(data) {
                try {
                    await navigator.clipboard.writeText(data);
                    alert("Copied script");
                }
                catch (e) {
                    alert("Unable to copy script: " + e.toString());
                }
            }
            
            INSERT_SCRIPT_LISTENERS_HERE
        </script>
    </body>
</html>
`;

/** @typedef {{ id: string }} BotcCharacter */
/** @typedef {{ id: "_meta", name: string, author: string }} BotcMeta */
/** @typedef {[BotcMeta, ...(BotcCharacter | string)[]]} BotcScript */

/**
 * @param {string} dir 
 * @returns {any[]}
 */
function readBotcJsons(dir) {
    return readdirSync(dir)
        .map(file => JSON.parse(readFileSync(join(dir, file)).toString()));
}

/** @type {BotcCharacter[]} */
const CHARACTERS = readBotcJsons("characters").flat();

/** @type {BotcScript[]} */
const SCRIPTS_RAW = readBotcJsons("scripts");

/** @type {BotcScript[]} */
const SCRIPTS_REPLACED = SCRIPTS_RAW.map(script => /** @type {BotcScript} */ (script.map(scriptCharacter => {
    if (typeof scriptCharacter === "string" && scriptCharacter.startsWith("bgw-")) {
        const ch = CHARACTERS.find(c => typeof c !== "string" && c.id === scriptCharacter);
        if (!ch) {
            throw new Error(`Unable to find homebrew character with ID ${scriptCharacter}`);
        }
        return ch;
    }
    else {
        return scriptCharacter;
    }
})));

if (!existsSync("dist/")) {
    mkdirSync("dist/");
}
writeFileSync("dist/index.html", TEMPLATE
    .replace(/INSERT_SCRIPT_BUTTONS_HERE/g, SCRIPTS_REPLACED.map((script, ix) => {
        return /* html */ `<button id="script-${ix}">${script[0].name}</button>`;
    }).join(""))
    .replace(/INSERT_SCRIPT_LISTENERS_HERE/g, SCRIPTS_REPLACED.map((script, ix) => {
        return /* js */ `
            document.querySelector("#script-${ix}").addEventListener("click", () => {
                copyToClipboard(${JSON.stringify(JSON.stringify(script))});
            });
        `;
    }).join(""))
);
