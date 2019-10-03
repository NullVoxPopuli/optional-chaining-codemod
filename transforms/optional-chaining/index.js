const { getParser } = require('codemod-cli').jscodeshift;
const { getOptions } = require('codemod-cli');

function astPrinter(ast, indent = 0) {
  if (!ast) {
    return;
  }

  let skip = [
    'loc',
    'start',
    'end',
    'prefix',
    'postfix',
    'label',
    'keyword',
    'beforeExpr',
    'startsExpr',
    'isAssign',
    'rihtAssociative',
  ];
  let keys = Object.keys(ast);

  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];

    // if (skip.includes(key)) {
    //   continue;
    // }
    let value = ast[key];

    if (key === 'value' && value === '?.') {
      console.log(key, ':', value);
    } else if (!skip.includes(key)) {
      astPrinter(value, indent + 2);
    }
  }
}

function transformer(file, api) {
  const j = getParser(api);
  const options = getOptions();

  let root = j(file.source);

  transformLogicalExpressions(j, root);
  transformCompounds(j, root);
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
  root
    .find(j.LogicalExpression, {
      operator: '&&',
      //left: { type: 'Identifier' },
      right: { type: 'MemberExpression' },
    })
    .forEach(path => {
      let { left, right } = path.node;

      if (left.type === 'Identifier') {
        let name = right.object.name;

        if (name !== left.name) {
          return;
        }

        j(path).replaceWith(j.optionalMemberExpression(j.identifier(left.name), right.property));
      } else if (left.type === 'LogicalExpression') {
        console.log(right, left);

        //let memberStr = memberExpressionToString(right);
        //let leftStr = memberExpressionToString(left);

        //leftStr = leftStr.replace('?', '');
      }
    });
}

function toOptional(j, memberExp) {
  return j.optionalMemberExpression(
    memberExp.object.type === 'MemberExpression'
      ? toOptional(j, memberExp.object)
      : memberExp.object,
    memberExp.property
  );
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

function toOptional(j, memberExp) {
  return j.optionalMemberExpression(
  	memberExp.object.type === 'MemberExpression'
    	? toOptional(j, memberExp.object)
    	: memberExp.object,
    memberExp.property
  );
}


function transformCompounds(j, root) {
   root.find(j.LogicalExpression, {
      operator: '&&',
      left: { type: 'MemberExpression' },
      right: { type: 'MemberExpression' }
    }).forEach(path => {
     let { left, right } = path.node;

     let leftStr = memberExpressionToString(left);
     let rightStr = memberExpressionToString(right);

     //if (rightStr.startsWith(leftStr)) {
       j(path).replaceWith(toOptional(j, right));
     //}
   });
}

module.exports = transformer;
module.exports.parser = 'ts';
