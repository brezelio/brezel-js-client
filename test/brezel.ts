import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon, {SinonStub} from 'sinon';
import Brezel, {Module} from '../src/index.js';

before(async () => {
    use(chaiAsPromised);
});

describe('BrezelClient', () => {
    let client: Brezel;
    let fetchStub: SinonStub;

    beforeEach(() => {
        fetchStub = sinon.stub(global, 'fetch');
        client = new Brezel({
            uri: 'https://api.example.com',
            system: 'test',
            key: 'testkey',
            token: 'testtoken',
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('fetchModules', () => {
        it('should call the correct endpoint and return a list of Modules', async () => {
            fetchStub.resolves({
                status: 200,
                json: () => Promise.resolve([
                    {
                        id: 1,
                        identifier: 'module1',
                    },
                    {
                        id: 2,
                        identifier: 'module2',
                    },
                ]),
            });
            const modules = await client.fetchModules();
            expect(modules).to.be.an('array');
            expect(modules[0]).to.be.instanceOf(Module);
            sinon.assert.calledWith(fetchStub, 'https://api.example.com/test/modules?layouts=false', sinon.match.any);
        });
    });

    describe('fetchModule', () => {
        it('should call the correct endpoint and return a Module', async () => {
            const moduleData = {
                id: 1,
                identifier: 'module1',
            };
            fetchStub.resolves({
                status: 200,
                json: () => Promise.resolve(moduleData),
            });
            const module = await client.fetchModule('module1');
            expect(module).to.be.instanceOf(Module);
            expect(module.id).to.equal(moduleData.id);
            expect(module.identifier).to.equal(moduleData.identifier);
            sinon.assert.calledWith(fetchStub, 'https://api.example.com/test/modules/module1', sinon.match.any);
        });
    });

    describe('createEntity', () => {
        it('should call the correct endpoint with the correct payload and method', async () => {
            const entityData = {
                id: 1,
                module: {
                    id: 1,
                    identifier: 'module1',
                    fields: [
                        {
                            id: 1,
                            identifier: 'title',
                            type: 'text',
                        },
                    ],
                },
            };
            fetchStub.resolves({
                status: 200,
                json: () => Promise.resolve(entityData),
            });
            await client.createEntity(entityData);
            sinon.assert.calledWith(fetchStub, 'https://api.example.com/test/modules/module1/resources', {
                headers: sinon.match({
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer testtoken',
                    'X-Api-Key': 'testkey',
                }),
                credentials: 'include',
                method: 'POST',
                body: JSON.stringify({...entityData, module: undefined}),
            });
        });
    });

    describe('fetchEntities', () => {
        it('should call the correct endpoint with the correct filters', async () => {
            const payload = {
                page: 0,
                filters: [{"column": "title", "operator": "=", "value": "Perfect"}],
            };
            fetchStub.resolves({
                status: 200,
                json: () => Promise.resolve({
                    data: [
                        {id: 1, module: {id: 1, identifier: 'module1'}, title: 'Perfect'},
                    ]
                }),
            });
            const entities = await client.fetchEntities('module1', {
                filters: [{
                    "column": "title",
                    "operator": "=",
                    "value": "Perfect"
                }]
            });
            expect(entities).to.be.an('array');
            expect(entities[0].title).to.equal('Perfect');
            sinon.assert.calledWith(fetchStub, `https://api.example.com/test/modules/module1/resources?filters=${encodeURIComponent(JSON.stringify(payload.filters))}`, sinon.match.any);
        });
        it('should throw an error if the response status is not 200', async () => {
            fetchStub.resolves({
                status: 500,
                json: () => Promise.resolve({}),
            });
            await expect(client.fetchEntities('module1')).to.be.rejectedWith('Could not fetch entities: Invalid response status 500 for https://api.example.com/test/modules/module1/resources');
        });
    });
});

// You can add more test cases in a similar way for the remaining methods...