const { getParser } = require('codemod-cli').jscodeshift;
const { getOptions } = require('codemod-cli');

function transformer(file, api) {
  const j = getParser(api);
  const options = getOptions();

  let root = j(file.source);

  transformLogicalExpressions(j, root);
  transformCompounds(j, root);

  return j(root).toSource();
}

function transformLogicalExpressions(j, root) {
  root
    .find(j.LogicalExpression, {
      operator: '&&',
      left: { type: 'Identifier' },
      right: { type: 'MemberExpression' },
    })
    .forEach(path => {
      let { left, right } = path.node;

      let name = right.object.name;

      if (name !== left.name) {
        return;
      }

      j(path).replaceWith(j.memberExpression(j.identifier(left.name), right.property));
    });
}

function transformCompounds(j, root) {
  root
    .find(j.LogicalExpression, {
      operator: '&&',
      left: { type: 'MemberExpression' },
      right: { type: 'MemberExpression' },
    })
    .forEach(path => {
      let { left, right } = path.node;

      let leftStr = memberExpressionToString(left);
      let rightStr = memberExpressionToString(right);

      if (rightStr.startsWith(leftStr)) {
        j(path).replaceWith(right);
      }
    });
}

function memberExpressionToString({ object, property }) {
  if (object.type === 'Identifier') {
    return `${object.name}.${property.name}`;
  }

  return `${memberExpressionToString(object)}.${property.name}`;
}

module.exports = transformer;
module.exports.parser = 'ts';
