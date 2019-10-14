/**
 * Prepend file name and number as part of the babel process
 *
 * @author Rasmus Höglund
 */

const loggers = {
  // funbers custom logger
  'log': {
    e:         1,
    w:         1,
    i:         1,
    d:         1,
    v:         1,
    sensitive: 1,
  },

  // standard console logger
  'console': {
    log:   1,
    warn:  1,
    info:  1,
    debug: 1,
    error: 1,
  }
};

function shouldInjectLinNumberAtPath(path, enabledLoggers) {
  const callee = path.node.callee;
  return callee.object
         && (!enabledLoggers || enabledLoggers.indexOf(callee.object.name) >= 0)
         && loggers[callee.object.name]
         && loggers[callee.object.name][callee.property.name];
}

function getParentFunctionName(path) {

  // recursively walk up the tree until we find either a named function or an assignment expression with a name
  const recursivelyFindClosestParentFunctionNameOrAssignedVariableName = (path) => {
    return (!path && 'anon') ||
           (path.node.id && path.node.id.name) ||
           (path.parent.type === 'AssignmentExpression' && path.parent.left.property && path.parent.left.property.name) ||
           (path.parent.type === 'VariableDeclarator' && path.parent.id && path.parent.id.name) ||
           recursivelyFindClosestParentFunctionNameOrAssignedVariableName(path.getFunctionParent());
  };

  return recursivelyFindClosestParentFunctionNameOrAssignedVariableName(path.getFunctionParent());
}


module.exports = () => {
  return {
    visitor: {
      CallExpression(path, state) {
        const opts = state.opts;

        if (shouldInjectLinNumberAtPath(path, opts.enabledLoggers)) {

          // get file name
          let file = state.file.opts.filename;
          if (opts.segments > 0) {
            file     = state.file.opts.filename.split('/');
            let segs = file.slice(Math.max(file.length - opts.segments));
            file     = segs.join('/');
          }

          // get function name
          const functionName = getParentFunctionName(path);

          const template = opts.template || '{{file}}:{{function}}:{{line}}';
          const tag      = template.replace('{{file}}', file)
            .replace('{{function}}', functionName)
            .replace('{{line}}', path.node.loc.start.line);

          // TODO: find out why we get here multiple times..
          // For some reason we might visit this code multiple times...
          if (path.node.arguments.length == 0 || path.node.arguments[0].value !== tag) {
            path.node.arguments.unshift({
              type:  'StringLiteral',
              value: tag
            });
          }
        }

      }
    }
  };
};
