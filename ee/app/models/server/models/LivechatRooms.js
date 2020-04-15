import { LivechatRooms } from '../../../../../app/models/server/models/LivechatRooms';
import { logger } from '../../../livechat-enterprise/server/lib/logger';
import { addQueryRestrictionsToRoomsModel } from '../../../livechat-enterprise/server/lib/query.helper';
import { overwriteClassOnLicense } from '../../../license/server';
import LivechatPriority from './LivechatPriority';

const applyRestrictions = (method) => function(originalFn, originalQuery, ...args) {
	const query = addQueryRestrictionsToRoomsModel(originalQuery);
	logger.queries.debug(() => `LivechatRooms.${ method } - ${ JSON.stringify(query) }`);
	return originalFn.call(this, query, ...args);
};

overwriteClassOnLicense('livechat-enterprise', LivechatRooms, {
	find: applyRestrictions('find'),
	findOne: applyRestrictions('findOne'),
	update: applyRestrictions('update'),
	remove: applyRestrictions('remove'),
	updateDepartmentAncestorsById(originalFn, _id, departmentAncestors) {
		const query = {
			_id,
		};
		const update = departmentAncestors ? { $set: { departmentAncestors } } : { $unset: { departmentAncestors: 1 } };
		return this.update(query, update);
	},
});


LivechatRooms.prototype.setPredictedVisitorAbandonment = function(roomId, willBeAbandonedAt) {
	const query = {
		_id: roomId,
	};
	const update = {
		$set: {
			'omnichannel.predictedVisitorAbandonmentAt': willBeAbandonedAt,
		},
	};

	return this.update(query, update);
};

LivechatRooms.prototype.findAbandonedOpenRooms = function(date) {
	return this.find({
		'omnichannel.predictedVisitorAbandonmentAt': { $lte: date },
		waitingResponse: { $exists: false },
		closedAt: { $exists: false },
		open: true,
	});
};

LivechatRooms.prototype.unsetPredictedVisitorAbandonment = function() {
	return this.update({
		open: true,
		t: 'l',
	}, {
		$unset: { 'omnichannel.predictedVisitorAbandonmentAt': 1 },
	}, {
		multi: true,
	});
};

export default LivechatRooms;
