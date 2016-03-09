var _ = require('lodash')
  , q = require('q')
  , req = require('superagent')
;

module.exports = {
    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var credentials    = dexter.provider('asana').credentials('access_token')
          , tasks          = step.input('task')
          , promises       = []
        ;

        tasks.each(function(task, idx) {

            var url     = 'https://app.asana.com/api/1.0/tasks/' + encodeURIComponent(task)
              , data    = {}
              , request = req.put(url)
                            .type('json')
                            .set('Authorization', 'Bearer '+credentials)
            ;

            _.each(['assignee', 'completed', 'due_on', 'name', 'notes', 'projects']
              , function(key) {
                  setIfExists(data, key, step.input(key)[idx] || step.input(key).first());
              });

            //normalize projects to an array
            if(data.projects) {
                data.projects = _.isArray(data.projects) ? data.projects : [ data.projects ];
            }

            request = request.send({ data: data });

            promises.push(
                promisify(request, 'end', 'body.data')
            );
        });

        q.all(promises)
          .then(this.complete.bind(this))
          .catch(this.fail.bind(this));
    }
};

function promisify(scope, call, path) {
    var deferred = q.defer(); 

    scope[call](function(err, result) {
        return err
          ? deferred.reject(err)
          : deferred.resolve(_.get(result, path))
        ;
    });

    return deferred.promise;
}

function setIfExists(obj, key, value) {
    if(value !== null & value !== undefined) {
        obj[key] = value;
    }
}
