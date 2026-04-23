module.exports = {
  preset: 'ts-jest',
  testPathIgnorePatterns: ['/dist/'],
  moduleFileExtensions: ["ts", "js"],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // maps './foo.js' to './foo'
  }
};
