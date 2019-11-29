module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "commonjs": true,
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module"
    },
    "globals": {
        "cc": true,
        "sp": true,
        "CC_EDITOR": true,
        "require": true,
        "wx": true
    },
    "rules": {
        // "indent": [
        //     "error",
        //     4
        // ],
        "linebreak-style": [
            "error",
            "windows"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-console": 0
    }
};