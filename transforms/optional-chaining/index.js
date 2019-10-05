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
      if (right.type === 'MemberExpression') {
        let name = right.object.name;

        if (name !== left.name) {
          return;
        }

        j(path).replaceWith(j.optionalMemberExpression(j.identifier(left.name), right.property));
      } else {
        console.log(left, right);
        handleCallExpression(path, left, right);
      }
    } else if (left.type === 'LogicalExpression') {
      if (right.type === 'CallExpression') {
        handleCallExpression(path, left.right, right);
      } else {
        handleMemberExpression(path, left.right, right);
      }

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

  function flatTokensFor(node) {
    let result = [];

    if (node.type === 'MemberExpression') {
      let { object, property } = node;

      result.push(flatTokensFor(object));
      result.push({ segment: property, maybeFalsey: false });
      result = result.flat();
    } else if (node.type === 'CallExpression') {
      let { arguments: args, callee } = node;
      let { object, property } = callee;

      result.push(flatTokensFor(object));
      result.push({ segment: property, maybeFalsey: false, args });
      result = result.flat();
    } else if (node.type === 'Identifier') {
      result.push({ segment: node, maybeFalsey: false });
    }

    return result;
  }

  function walkTheLeft(left, tokenizedRight, offset = 0) {
    if (left.type === 'LogicalExpression' && left.operator === '&&') {
      walkTheLeft(left.left, tokenizedRight, offset + 1);
      return;
    } else if (left.type === 'Identifier') {
      let { segment } = tokenizedRight[offset];

      console.log(left.name, segment.name);
      if (left.name === segment.name) {
        tokenizedRight[offset].maybeFalsey = true;
      }
      return;
    } else if (left.type === 'MemberExpression' || left.type === 'OptionalMemberExpression') {
      //walkTheLeft(left.object, tokenizedRight, offset);
      walkTheLeft(left.property, tokenizedRight, offset + 1);
      return;
    }

    console.log('unhandeled', left);
  }

  function segmentsToMembers(j, segments) {
    if (!segments || segments.length === 0) {
      return;
    }
    let [first] = segments;
    let [last, ...leading] = [...segments].reverse();
    leading.reverse();

    if (first === last || leading.length === 0) {
      return first.segment;
    }

    let subExp = segmentsToMembers(j, [first, ...endlessTail]);
    let subExpNext = endlessTail[endlessTail.length - 1];

    console.log(first, last);
    if (subExpNext && subExpNext.maybeFalsey) {
      return j.optionalMemberExpression(subExp, j.identifier(last.segment.name));
    }

    return j.memberExpression(subExp, j.identifier(last.segment.name));
  }

  function tokensToAST(j, path, tokens) {
    let [last, ...reversed] = [...tokens].reverse();
    let segments = [...reversed.reverse(), last];

    let isCall = last.hasOwnProperty('args');
    let newAst;

    if (isCall) {
      let { args } = last;
      let memberExp = segmentsToMembers(j, segments);

      newAst = j.callExpression(memberExp, args);
    } else {
      newAst = segmentsToMembers(j, segments);
    }

    return newAst;
  }

  function handleLogicalExpression2(path) {
    let node = path.node;
    let { left, right } = node;

    // We only want to augment what's on the right side, and
    // eliminate what is on the left
    let tokenizedRight = flatTokensFor(right);

    // walk the left, and see what can be eliminated,
    // resulting in maybeFalsey becoming true
    walkTheLeft(left, tokenizedRight);
    console.log(tokenizedRight);

    // swap out the right side's tokenized state with AST
    // left side will be cleaned up next
    let newRightAst = tokensToAST(j, j(right), tokenizedRight);

    // TODO: verify that everything on the left can be replaced
    j(path).replaceWith(newRightAst);
  }

  root
    .find(j.LogicalExpression, {
      operator: '&&',
      //left: { type: 'Identifier' },
      right: { type: 'MemberExpression' },
    })
    .forEach(path => {
      handleLogicalExpression2(path);
    });

  root
    .find(j.LogicalExpression, {
      operator: '&&',
      //left: { type: 'Identifier' },
      right: { type: 'CallExpression' },
    })
    .forEach(path => {
      handleLogicalExpression2(path);
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
