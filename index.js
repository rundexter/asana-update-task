var _ = require('lodash'),
    util = require('./util.js'),
    request = require('request').defaults({
        /* baseUrl: 'https://app.asana.com/api/1.0/' */
    }),
    pickInputs = {
        'task': { key: 'task', validate: { req: true } },
        'assignee': 'assignee',
        'assignee_status': 'assignee_status',
        'completed': 'completed',
        'due_on': 'due_on',
        'name': 'name',
        'external': 'external',
        'projects': 'projects',
        'notes': 'notes'
    },
    pickOutputs = {
        'name': 'data.name',
        'notes': 'data.notes',
        'assignee_name': 'data.assignee.name',
        'completed': 'data.completed',
        'followers_name': { key: 'data.followers', fields: ['name'] },
        'projects_name': { key: 'data.projects', fields: ['name'] },
        'workspace_name': 'data.workspace.name',
        'due_on': 'data.due_on'
    };

require( 'request-debug' )(request);

module.exports = {
    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var credentials = dexter.provider('asana').credentials('access_token'),
            inputs = util.pickInputs(step, pickInputs),
            validateErrors = util.checkValidateErrors(inputs, pickInputs);

        // check params.
        if (validateErrors)
            return this.fail(validateErrors);

        var task_id = inputs.task.substr( 0, 8 ) == 'external' ? 'external:' + encodeURIComponent( inputs.task.substr( 9 ) ) : inputs.task;

        //send API request
        request.put({
            uri: 'https://app.asana.com/api/1.0/tasks/' + task_id,
            body: JSON.stringify( { 'data': _.omit(inputs, 'task') } ),
            auth: {
                'bearer': credentials
            },
        }, function (error, response, body) {
            if (error || (body && body.errors) || response.statusCode >= 400)
                this.fail(error || body.errors || { statusCode: response.statusCode, headers: response.headers, body: body });
            else
                this.complete(util.pickOutputs(body, pickOutputs) || {});

        }.bind(this));
    }
};
