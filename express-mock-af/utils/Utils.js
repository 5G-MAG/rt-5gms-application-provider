const fs = require('fs');
const path = require('path');
const dir = require('node-dir');
const { chain, isEmpty } = require('lodash');
const { BehaviorSubject } = require('rxjs');


class Utils {
    static fileWritten$ = new BehaviorSubject('');

    static async writeToDisk(filepath, content) {
        return new Promise((resolve, reject) => {
            fs.mkdirSync(path.dirname(filepath), { recursive: true });
            fs.writeFile(filepath, content, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.fileWritten$.next(content);
                    resolve();
                }
            });
        });
    }

    static async readFiles(directoryPathRoot) {
        try {
            const filePaths = await Utils.getDirectoriesRecursive(directoryPathRoot);
            return chain(filePaths)
                .map(path => {
                    const fileContent = fs.readFileSync(path, 'utf-8');
                    return fileContent ? fileContent : null;
                })
                .filter(content => !isEmpty(content))
                .value();
        } catch (error) {
            console.error(`Error reading files from ${directoryPathRoot}: ${error.message}`);
            return [];
        }
    }

    static async getDirectoriesRecursive(srcpath) {
        return new Promise((resolve, reject) => {
            dir.readFiles(srcpath, {
                    match: /\.xml$/
                },
                function (err, content, next) {
                    if (err) return reject(err);
                    next();
                },
                function (err, files) {
                    if (err) return reject(err);
                    resolve(files);
                });
        });
    }

    static regexRangeToNumberArray(rangeString) {
        if (rangeString.includes(',')) {
            return rangeString.split(',').map(Number);
        } else if (rangeString.includes('-')) {
            const [start, end] = rangeString.split('-').map(Number);
            const result = [];
            for (let i = start; i <= end; i++) {
                result.push(i);
            }
            return result;
        } else {
            return [Number(rangeString)];
        }
    }
}

module.exports = Utils;
