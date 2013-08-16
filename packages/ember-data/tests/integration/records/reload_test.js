var get = Ember.get, set = Ember.set;
var attr = DS.attr;
var Person, env;

module("integration/reload - Reloading Records", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string')
    });

    Person.toString = function() { return "Person"; };

    env = setupStore({ person: Person });
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("When a single record is requested, the adapter's find method should be called unless it's loaded.", function() {
  var count = 0;

  env.adapter.find = function(store, type, id) {
    if (count === 0) {
      count++;
      return Ember.RSVP.resolve({ id: id, name: "Tom Dale" });
    } else if (count === 1) {
      count++;
      return Ember.RSVP.resolve({ id: id, name: "Braaaahm Dale" });
    } else {
      ok(false, "Should not get here");
    }
  };

  env.store.find('person', 1).then(async(function(person) {
    equal(get(person, 'name'), "Tom Dale", "The person is loaded with the right name");
    equal(get(person, 'isLoaded'), true, "The person is now loaded");
    var promise = person.reload();
    equal(get(person, 'isReloading'), true, "The person is now reloading");
    return promise;
  })).then(async(function(person) {
    equal(get(person, 'isReloading'), false, "The person is no longer reloading");
    equal(get(person, 'name'), "Braaaahm Dale", "The person is now updated with the right name");
  }));
});

test("If a record is modified, it cannot be reloaded", function() {
  var count = 0;

  env.adapter.find = function(store, type, id) {
    if (count === 0) {
      count++;
      return Ember.RSVP.resolve({ id: id, name: "Tom Dale" });
    } else {
      ok(false, "Should not get here");
    }
  };

  env.store.find('person', 1).then(async(function(person) {
    set(person, 'name', "Braaaaahm Dale");

    raises(function() {
      person.reload();
    }, /uncommitted/);
  }));
});


test("When a record is loaded a second time, isLoaded stays true", function() {
  env.store.push('person', { id: 1, name: "Tom Dale" });

  env.store.find('person', 1).then(async(function(person) {
    equal(get(person, 'isLoaded'), true, "The person is loaded");
    person.addObserver('isLoaded', isLoadedDidChange);

    // Reload the record
    env.store.push('person', { id: 1, name: "Tom Dale" });
    equal(get(person, 'isLoaded'), true, "The person is still loaded after load");

    person.removeObserver('isLoaded', isLoadedDidChange);
  }));

  function isLoadedDidChange() {
    // This shouldn't be hit
    equal(get(this, 'isLoaded'), true, "The person is still loaded after change");
  }
});
