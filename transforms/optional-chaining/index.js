const { getParser } = require('codemod-cli').jscodeshift;

function transformer(file, api) {
  const j = getParser(api);
  // const options = getOptions();

  let root = j(file.source);

  transformLogicalExpressions(j, root);
  transformMemberExpressions(j, root);

  return root.toSource();
}

function transformMemberExpressions(j, root) {
  root
    .find(j.MemberExpression, {
      object: {
        type: 'LogicalExpression',
        operator: '||',
        left: { type: 'Identifier' },
        right: { type: 'ObjectExpression' },
      },
    })
    .forEach(path => {
      let { object, property } = path.node;

      j(path).replaceWith(j.optionalMemberExpression(object.left, property));
    });

  root
    .find(j.MemberExpression, {
      object: {
        type: 'LogicalExpression',
        operator: '||',
        right: { type: 'ObjectExpression' },
      },
    })
    .forEach(path => {
      let { object, property } = path.node;

      j(path).replaceWith(j.optionalMemberExpression(object.left, property));
    });
}

function transformLogicalExpressions(j, root) {
  function handleMemberExpression(path, left, right) {
    let leftStr = memberExpressionToString(left);
    let rightStr = memberExpressionToString(right);

    if (rightStr.includes(leftStr.replace('?', ''))) {
      let newRight = rightStr.replace(leftStr, '');
      j(path).replaceWith(j.identifier(`${leftStr}?${newRight}`));
    }
  }

  function handleCallExpression(path, left, callExp) {
    let leftStr = memberExpressionToString(left);
    let rightStr = memberExpressionToString(callExp.callee);

    if (rightStr.includes(leftStr.replace('?', ''))) {
      let newRight = rightStr.replace(leftStr, '');
      j(path).replaceWith(
        j.callExpression(j.identifier(`${leftStr}?${newRight}`), callExp.arguments)
      );
    }
  }

  function handleLogicalExpression(path) {
    let node = path.node || path.value;
    if (!node) return;

    let { left, right } = node;

    if (left.type === 'Identifier') {
      let name = right.object.name;

      if (name !== left.name) {
        return;
      }

      j(path).replaceWith(j.optionalMemberExpression(j.identifier(left.name), right.property));
    } else if (left.type === 'LogicalExpression') {
      handleLogicalExpression(j(left));

      //transformLogicalExpressions(j, root);
    } else if (left.type === 'MemberExpression' || left.type === 'OptionalMemberExpression') {
      if (right.type === 'CallExpression') {
        handleCallExpression(path, left, right);
      } else {
        handleMemberExpression(path, left, right);
      }
    } else if (left.type === 'OptionalMemberExpression') {
    } else {
      console.log(left);
    }
  }

  root
    .find(j.LogicalExpression, {
      operator: '&&',
      //left: { type: 'Identifier' },
      right: { type: 'MemberExpression' },
    })
    .forEach(path => {
      handleLogicalExpression(path);
    });

  root
    .find(j.LogicalExpression, {
      operator: '&&',
      //left: { type: 'Identifier' },
      right: { type: 'CallExpression' },
    })
    .forEach(path => {
      handleLogicalExpression(path);
    });
}

function memberExpressionToString({ object, property }) {
  if (object.type === 'Identifier') {
    return `${object.name}.${property.name}`;
  }

  return `${memberExpressionToString(object)}.${property.name}`;
}

function toOptional(j, memberExp) {
  return j.optionalMemberExpression(
    memberExp.object.type === 'MemberExpression'
      ? toOptional(j, memberExp.object)
      : memberExp.object,
    memberExp.property
  );
}

module.exports = transformer;
module.exports.parser = 'ts';
