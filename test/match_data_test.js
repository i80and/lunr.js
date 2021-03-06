suite('lunr.MatchData', function () {
  suite('#combine', function () {
    setup(function () {
      this.match = new lunr.MatchData('foo', 'title', {
        position: [1]
      })

      this.match.combine(new lunr.MatchData('bar', 'title', {
        position: [2]
      }))

      this.match.combine(new lunr.MatchData('baz', 'body', {
        position: [3]
      }))

      this.match.combine(new lunr.MatchData('baz', 'body', {
        position: [4]
      }))
    })

    test('#terms', function () {
      assert.sameMembers(['foo', 'bar', 'baz'], Object.keys(this.match.metadata))
    })

    test('#metadata', function () {
      assert.deepEqual(this.match.metadata.foo.title.position, [1])
      assert.deepEqual(this.match.metadata.bar.title.position, [2])
      assert.deepEqual(this.match.metadata.baz.body.position, [3, 4])
    })
  })
})
