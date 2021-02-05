# babel-preset-preact
Babel preset to transform JSX into h() calls.

### Install

Via NPM

```javascript
npm install babel-preset-preact --save-dev
```

or Yarn

```javascript
yarn add babel-preset-preact --dev
```

### Usage

Make or update your .babelrc config file with the preset:

```javascript
{
  "presets": [
    "preact"
  ]
}
```

Via package.json

```javascript
   ...
   "babel": {
     "presets": [
       "es2015",
       "preact"
     ],
     "plugins": [
     ]
   },
   ...
```
