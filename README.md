# Reproduce aliasing bug
https://github.com/ardatan/graphql-tools/issues/2829

## Resources
- https://github.com/ardatan/graphql-tools/issues/967

## Run

```
npm install
node src/index.js
```

expected output, reproducing bug:
```
{"errors":[{"message":"Cannot return null for non-nullable field Post.text.","locations":[{"line":7,"column":7}],"path":["userById","posts",0,"body"]}],"data":null}
```