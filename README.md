# optional-chaining-codemod

Transforms:

```
foo && foo.bar;
foo.bar && foo.bar.baz;

(foo || {}).bar;
((foo || {}).bar || {}).baz;
((foo || {}).bar || {}).baz();
```

to

```
foo?.bar;
foo.bar?.baz;

foo?.bar;
foo?.bar?.baz;
foo?.bar?.baz();
```


## Usage

To run a specific codemod from this project, you would run the following:

```
npx @nullvoxpopuli/optional-chaining-codemod path/of/files/ or/some**/*glob.js

# or

yarn global add @nullvoxpopuli/optional-chaining-codemod
optional-chaining-codemod path/of/files/ or/some**/*glob.js

# or

volta install @nullvoxpopuli/optional-chaining-codemod
optional-chaining-codemod path/of/files/ or/some**/*glob.js
```

## Transforms

<!--TRANSFORMS_START-->
* [optional-chaining](transforms/optional-chaining/README.md)
<!--TRANSFORMS_END-->

## Contributing

### Installation

* clone the repo
* change into the repo directory
* `yarn`

### Running tests

* `yarn test`

### Update Documentation

* `yarn update-docs`
