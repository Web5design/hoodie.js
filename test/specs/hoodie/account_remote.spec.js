/* global hoodieRemote:true */

describe('hoodie.remote', function() {
  beforeEach(function() {
    this.hoodie = new Mocks.Hoodie();
    this.openConnectSpy = sinon.spy();
    this.sandbox.stub(this.hoodie, 'open').returns({
      connect: this.openConnectSpy,
      disconnect: sinon.spy(),
      push: sinon.spy()
    });
    this.sandbox.stub(this.hoodie.account, 'db').returns('userdb');
    this.sandbox.stub(this.hoodie.config, 'get').withArgs('_remote.since').returns(10);
    this.hoodie.store.index.returns(['funk/1', '$task/2']);

    this.clock = this.sandbox.useFakeTimers(0); // '1970-01-01 00:00:00'
    hoodieRemote(this.hoodie);
    this.remote = this.hoodie.remote;
    this.openArgs = this.hoodie.open.args[0];
  });

  it('should open the users store', function() {
    var name = this.openArgs[0];
    expect(name).to.eql('userdb');
  });

  it('should open the users store with connected = true', function() {
    var options = this.openArgs[1];
    expect(options.connected).to.eql( true );
  });

  it('should open the users store with prefix = ""', function() {
    var options = this.openArgs[1];
    expect(options.prefix).to.eql( '' );
  });

  it('should pass function that returns current since sequence number', function() {
    var args = this.openArgs[1];
    expect(args.since()).to.eql(10);
  });


  it('should open the users store with defaultObjectsToPush', function() {
    var options = this.openArgs[1];
    expect(options.defaultObjectsToPush).to.eql( this.hoodie.store.changedObjects );
  });

  it('should open the users store with knownObjects', function() {
    var options = this.openArgs[1];
    expect(options.knownObjects).to.eql( [{ type: 'funk', id: '1'}, { type: '$task', id: '2'}] );
  });

  describe('#trigger', function() {
    beforeEach(function() {
      this.sandbox.spy(this.hoodie, 'trigger');
    });
    it('should prefix events with "remote"', function() {
      expect(this.remote.name).to.be(undefined);
      this.remote.trigger('funky', 'fresh');
      expect(this.hoodie.trigger).to.be.calledWith('remote:funky', 'fresh');
    });
  });

  describe('#on', function() {
    beforeEach(function() {
      this.sandbox.spy(this.hoodie, 'on');
    });
    it('should prefix events with "remote"', function() {
      expect(this.remote.name).to.be(undefined);
      var cb = function() {};
      this.remote.on('funky fresh', cb);
      expect(this.hoodie.on).to.be.calledWith('remote:funky remote:fresh', cb);
    });
  });

  describe('#unbind', function() {
    beforeEach(function() {
      this.sandbox.spy(this.hoodie, 'unbind');
    });
    it('should prefix events with "remote"', function() {
      expect(this.remote.name).to.be(undefined);
      var cb = function() {};
      this.remote.unbind('funky fresh', cb);
      expect(this.hoodie.unbind).to.be.calledWith('remote:funky remote:fresh', cb);
    });
  });

  describe('#subscribeToEvents', function() {
    beforeEach(function() {
      var events = {};

      this.sandbox.stub(this.hoodie, 'on', function(eventName, cb) {
        events[eventName] = cb;
      });
      this.sandbox.spy(this.hoodie, 'unbind');
      this.sandbox.spy(this.hoodie.config, 'set');
      this.remote.subscribeToEvents();
      this.hoodie.on.reset();
      this.events = events;
    });

    it('subscribes to remote:connect', function() {
      expect(this.events['remote:connect']).to.be.a(Function);
    });
    it('pushes local changes on remote:connect', function() {
      this.events['remote:connect']();
      expect(this.remote.push).to.be.called();
    });
    it('subscribes to store:idle on remote:connect', function() {
      this.events['remote:connect']();
      expect(this.hoodie.on).to.be.calledWith('store:idle', this.remote.push);
    });

    it('subscribes to remote:disconnect', function() {
      expect(this.events['remote:disconnect']).to.be.a(Function);
    });
    it('unbinds from store:idle on remote:disconnect', function() {
      this.events['remote:disconnect']();
      expect(this.hoodie.unbind).to.be.calledWith('store:idle', this.remote.push);
    });

    it('subscribes to reconnected', function() {
      expect(this.events.reconnected).to.be.a(Function);
    });
    it('connects on reconnected when user has account', function() {
      this.sandbox.stub(this.hoodie.account, 'hasAccount').returns(true);
      this.hoodie.account.db.returns('dbnamehere');
      this.events.reconnected();
      expect(this.openConnectSpy).to.be.calledWith('dbnamehere');
    });
    it('does not connect on reconnected when user has no account', function() {
      this.sandbox.stub(this.hoodie.account, 'hasAccount').returns(false);
      this.hoodie.account.db.returns('dbnamehere');
      this.events.reconnected();
      expect(this.openConnectSpy).to.not.be.called();
    });
    it('disconnects on disconnected', function() {
      this.events.disconnected();
      expect(this.remote.disconnect).to.be.called();
    });

    it('subscribes to account:signin', function() {
      expect(this.events['account:signin']).to.be.a(Function);
    });
    it('connects to db on account:signin', function() {
      this.sandbox.stub(this.hoodie.account, 'hasAccount').returns(true);
      this.hoodie.account.db.returns('dbName');
      this.events['account:signin'](123);
      expect(this.openConnectSpy).to.be.calledWith('dbName');
    });
    it('subscribes to account:signin:anonymous', function() {
      expect(this.events['account:signin:anonymous']).to.be.a(Function);
    });
    it('connects to db on account:signin:anonymous', function() {
      this.sandbox.stub(this.hoodie.account, 'hasAccount').returns(true);
      this.hoodie.account.db.returns('dbName');
      this.events['account:signin:anonymous'](123);
      expect(this.openConnectSpy).to.be.calledWith('dbName');
    });

    it('subscribes to account:reauthenticated', function() {
      expect(this.events['account:reauthenticated']).to.be.a(Function);
    });
    it('connects on account:reauthenticated', function() {
      this.sandbox.stub(this.hoodie.account, 'hasAccount').returns(true);
      this.hoodie.account.db.returns('dbName');
      this.events['account:reauthenticated'](123);
      expect(this.openConnectSpy).to.be.calledWith('dbName');
    });

    it('subscribes to account:signout', function() {
      expect(this.events['account:signout']).to.be.a(Function);
    });
    it('disconnects on account:signout', function() {
      this.events['account:signout'](123);
      expect(this.remote.disconnect).to.be.called();
    });
  });
});
