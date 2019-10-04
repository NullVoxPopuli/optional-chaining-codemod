# optional-chaining


## Usage

```
npx typescript-optional-chaining-codemod optional-chaining path/of/files/ or/some**/*glob.js

# or

yarn global add typescript-optional-chaining-codemod
typescript-optional-chaining-codemod optional-chaining path/of/files/ or/some**/*glob.js
```

## Input / Output

<!--FIXTURES_TOC_START-->
* [basic](#basic)
<!--FIXTURES_TOC_END-->

<!--FIXTURES_CONTENT_START-->
---
<a id="basic">**basic**</a>

**Input** (<small>[basic.input.ts](transforms/optional-chaining/__testfixtures__/basic.input.ts)</small>):
```ts
foo && foo.bar;
foo.bar && foo.bar.baz;
foo && foo.bar && foo.bar.baz;
foo && foo.bar && foo.bar.baz();
foo && foo.bar && foo.bar.baz && foo.bar.baz();
foo.bar && foo.bar.baz();

(foo || {}).bar;
((foo || {}).bar || {}).baz;
((foo || {}).bar || {}).baz();

```

**Output** (<small>[basic.output.ts](transforms/optional-chaining/__testfixtures__/basic.output.ts)</small>):
```ts
foo?.bar;
foo.bar?.baz;
foo?.bar?.baz;
foo?.bar?.baz();
foo.bar?.baz();

foo?.bar;
foo?.bar?.baz;
foo?.bar?.baz();

```
<!--FIXTURES_CONTENT_END-->