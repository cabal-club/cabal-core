function resolve(href, cb) {
    return cb(null, encoding.decode(href))
}

module.exports = resolve
