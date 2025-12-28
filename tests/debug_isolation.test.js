const { User } = require('../src/models');

describe('DB Isolation Debug', () => {
    it('should persist user within the same test', async () => {
        const email = `debug_${Date.now()}@test.com`;

        console.log('Creating user 1...');
        const user1 = await User.create({
            fullName: 'Debug 1',
            email: email,
            passwordHash: 'hash',
            role: 'student',
            status: 'active'
        });
        console.log('User 1 created:', user1.id);

        const found = await User.findOne({ where: { email } });
        console.log('Found user:', found ? found.id : 'null');
        expect(found).not.toBeNull();
        expect(found.id).toBe(user1.id);

        console.log('Attempting duplicate create...');
        try {
            await User.create({
                fullName: 'Debug 2',
                email: email,
                passwordHash: 'hash',
                role: 'student',
                status: 'active'
            });
            console.log('Duplicate create SUCCEEDED (Unexpected)');
        } catch (e) {
            console.log('Duplicate create FAILED (Expected):', e.name);
        }
    });
});
