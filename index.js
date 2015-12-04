var _ = require('lodash');
var request = require('request').defaults({
    baseUrl: 'https://app.asana.com/api/1.0/'
});
var globalPickResult = {
    'data.name': 'name',
    'data.notes': 'notes',
    'data.assignee.name': 'assignee_name',
    'data.completed': 'completed',
    'data.followers': {
        key: 'followers_name',
        fields: {
            name: 'name'
        }
    },
    'data.projects': {
        key: 'projects_name',
        fields: {
            name: 'name'
        }
    },
    'data.workspace.name': '.workspace_name',
    'data.due_on': 'due_on'
};

var inputAttributes = [
    'assignee',
    'assignee_status',
    'completed',
    'due_on',
    'name',
    'external',
    'notes',
    'projects'
];

module.exports = {
    /**
     * Return pick result.
     *
     * @param output
     * @param pickResult
     * @returns {*}
     */
    pickResult: function (output, pickResult) {
        var result = {};

        _.map(_.keys(pickResult), function (resultVal) {

            if (_.has(output, resultVal)) {

                if (_.isObject(pickResult[resultVal])) {
                    if (_.isArray(_.get(output, resultVal))) {

                        if (!_.isArray(result[pickResult[resultVal].key])) {
                            result[pickResult[resultVal].key] = [];
                        }

                        _.map(_.get(output, resultVal), function (inOutArrayValue) {

                            result[pickResult[resultVal].key].push(this.pickResult(inOutArrayValue, pickResult[resultVal].fields));
                        }, this);
                    } else if (_.isObject(_.get(output, resultVal))){

                        result[pickResult[resultVal].key] = this.pickResult(_.get(output, resultVal), pickResult[resultVal].fields);
                    }
                } else {
                    _.set(result, pickResult[resultVal], _.get(output, resultVal));
                }
            }
        }, this);

        return result;
    },

    /**
     * Return auth object.
     *
     *
     * @param dexter
     * @returns {*}
     */
    authParams: function (dexter) {
        var res = {};

        if (dexter.environment('asana_access_token')) {
            res = {
                bearer: dexter.environment('asana_access_token')
            };
        } else {
            this.fail('A [asana_access_token] env variables need for this module');
        }

        return res;
    },

    /**
     * Send api request.
     *
     * @param method
     * @param api
     * @param options
     * @param auth
     * @param callback
     */
    apiRequest: function (method, api, options, auth, callback) {

        request[method]({url: api, form: options, auth: auth, json: true}, callback);
    },

    prepareStringInputs: function (inputs, inputAttributes) {
        var result = {};

        _.map(_.pick(inputs, inputAttributes), function (inputValue, inputKey) {

            result[inputKey] = _(inputValue).toString();
        });

        return result;
    },

    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var auth = this.authParams(dexter);

        this.apiRequest('put', 'tasks/'.concat(step.input('task').first()), this.prepareStringInputs(step.inputs(), inputAttributes), auth, function (error, responce, body) {

            if (error || body.errors) {

                this.fail(error || body.errors);
            } else {

                this.complete(this.pickResult(body, globalPickResult));
            }
        }.bind(this));
    }
};
