/*!
 * lunr.stemmer
 * Copyright (C) @YEAR Oliver Nightingale
 * Includes code from - http://tartarus.org/~martin/PorterStemmer/js.txt
 */

/**
 * lunr.TokenStore is used for efficient storing and lookup of the reverse
 * index of token to document ref.
 *
 * @constructor
 */
lunr.TokenStore = function () {
  this.root = Object.create(null)
  this.tokens = Object.create(null)
  this.length = 0
}

/**
 * Loads a previously serialised token store
 *
 * @param {Object} serialisedData The serialised token store to load.
 * @returns {lunr.TokenStore}
 * @memberOf TokenStore
 */
lunr.TokenStore.load = function (serialisedData) {
  var store = new this

  store.root = serialisedData.root
  store.tokens = serialisedData.tokens
  store.length = serialisedData.length

  return store
}

/**
 * Converts the trie into a radix tree.
 *
 * @memberOf TokenStore
 */
lunr.TokenStore.prototype.compress = function () {
  var queue = [this.root]

  while (queue.length) {
    var currentNode = queue.pop()
    var currentKeys = Object.keys(currentNode)
    for (var i = 0; i < currentKeys.length; i += 1) {
      // Check if any children are single-element
      var key = currentKeys[i]
      var child = currentNode[key]

      var childKeys = Object.keys(child)
      if (childKeys.length === 1) {
        // Collapse this child if there is not a corresponding token
        var childKey = childKeys[0]
        var newChildKey = key + childKey
        var newChild = child[childKey]
        currentNode[newChildKey] = newChild
        queue.push(currentNode)
        delete currentNode[key]
      } else {
        queue.push(child)
      }
    }
  }
}

/**
 * Adds a new token doc pair to the store.
 *
 * By default this function starts at the root of the current store, however
 * it can start at any node of any token store if required.
 *
 * @param {String} token The token to store the doc under
 * @param {Object} doc The doc to store against the token
 * @param {Object} root An optional node at which to start looking for the
 * correct place to enter the doc, by default the root of this lunr.TokenStore
 * is used.
 * @memberOf TokenStore
 */
lunr.TokenStore.prototype.add = function (token, doc, root, origToken) {
  var root = root || this.root,
      key = token.charAt(0),
      rest = token.slice(1),
      origToken = origToken || token

  if (!(key in root)) root[key] = Object.create(null)

  if (rest.length === 0) {
    if (this.tokens[origToken]) {
      this.tokens[origToken].push(doc.ref, doc.tf)
    } else {
      this.tokens[origToken] = [doc.ref, doc.tf]
    }

    this.length += 1
    return
  } else {
    return this.add(rest, doc, root[key], origToken)
  }
}

/**
 * Checks whether this key is contained within this lunr.TokenStore.
 *
 * By default this function starts at the root of the current store, however
 * it can start at any node of any token store if required.
 *
 * @param {String} token The token to check for
 * @param {Object} root An optional node at which to start
 * @memberOf TokenStore
 */
lunr.TokenStore.prototype.has = function (token) {
  return this.tokens[token] !== undefined
}

/**
 * Retrieve the documents for a node for the given token.
 *
 * Documents are returned in interleaved format to save memory. For
 * example, docs[0] is a document ref; docs[1] is that document's tf;
 * docs[2] is the next document's ref; etc.
 *
 * @param {String} token The token to get the documents for.
 * @returns {Array}
 * @memberOf TokenStore
 */
lunr.TokenStore.prototype.get = function (token) {
  return this.tokens[token] || []
}

lunr.TokenStore.prototype.count = function (token, root) {
  return this.get(token, root).length / 2
}

/**
 * Remove the document identified by ref from the token in the store.
 *
 * @param {String} token The token to get the documents for.
 * @param {String} ref The ref of the document to remove from this token.
 * @memberOf TokenStore
 */
lunr.TokenStore.prototype.remove = function (token, ref) {
  var docsHavingToken = this.tokens[token]
  if (!docsHavingToken) { return }

  var docIndex = docsHavingToken.indexOf(ref)
  if (docIndex === -1) { return }

  docsHavingToken.splice(docIndex, docIndex + 2)

  if (docsHavingToken.length === 0) {
    delete this.tokens[token]
  }

  // We can do additional cleanup of the tree, since there may be orphan nodes
  // under the root that no longer correspond to a token. However, this could
  // be time-consuming and shouldn't change results, so don't do here.
}

/**
 * Find all the possible suffixes of the passed token using tokens
 * currently in the store.
 *
 * @param {String} token The token to expand.
 * @returns {Array}
 * @memberOf TokenStore
 */
lunr.TokenStore.prototype.expand = function (token) {
  var results = Object.create(null)
  var nodeStack = [this.root]
  var keyStack = ['']
  var curNode

  while (nodeStack.length) {
    var curNode = nodeStack.pop()
    var curNodeKey = keyStack.pop()

    var curChildren = Object.keys(curNode)
    for (var childIndex = 0; childIndex < curChildren.length; childIndex += 1) {
      var key = curChildren[childIndex]
      var fullKey = curNodeKey + key
      if (token.startsWith(fullKey)) {
        nodeStack.push(curNode[key])
        keyStack.push(fullKey)
      } else if (fullKey.startsWith(token)) {
        nodeStack.push(curNode[key])
        keyStack.push(fullKey)

        var tryKey = curNodeKey
        for (var i = 0; i <= key.length; i += 1) {
          if (this.has(tryKey)) {
            results[tryKey] = 1
          }

          tryKey += key.charAt(i)
        }
      }
    }
  }

  return Object.keys(results)
}

/**
 * Returns a representation of the token store ready for serialisation.
 *
 * @returns {Object}
 * @memberOf TokenStore
 */
lunr.TokenStore.prototype.toJSON = function () {
  return {
    root: this.root,
    tokens: this.tokens,
    length: this.length
  }
}
