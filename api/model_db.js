
const { Func }	= require('./func.js');

class ModelDb {
	
	// Synchronizes db model with js model, create or alter tables
	static synchronizeModel(model, client)
	{
		return new Promise(resolve => {
			var promises = [];
			// check for tables
			for (var e in model.entities)
			{
				Func.log("Promise for " + e + " + created");
				promises.push(ModelDb.checkTable(model, client, e));
			}
			
			Promise.all(promises).then(values => { 
				Func.log("All promises fired");
				resolve('resolved');
			});
		});
	}	
	
	static checkTable(model, client, entity)
	{
		var table_present = false;
		var query = {};
			
		Func.log("Starting promise chain for entity " + entity);
		return new Promise(resolve => {
			Func.query(client,  "SELECT * FROM " + entity)
			.then((value) => {
				Func.log('table ' + entity + ' is present');
				table_present = true;
			})
			.catch((value) => {
				Func.log('table ' + entity + ' is not present');
			})
			.then((value) => {
				if (table_present == false)
				{
					return Func.query(client, "CREATE TABLE " + entity + "();");
				}
			})
			.then((value) => {
				if (table_present == false) Func.log('Table ' + entity + ' created.');
			})
			.catch((value) => { 
				Func.log('Table ' + entity + ' failed in creation');
				return Promise.resolve();
			}).then((value) => {
				return Func.query(client, "SELECT * FROM " + entity + " LIMIT 1 ");
			})
			.catch((value) => 
			{ 
				Func.log("Failed: " + query.last);
				Func.log(value);
			})
			.then((value) =>
			{
				return ModelDb.alterTable(model, entity, client, value);
			})
			.finally((value) =>
			{
				resolve();
			});
		});
	};
	
	static alterTable(model, entity, client, value)
	{
		Func.log("Now firing alter table for " + entity);
		var ent = model.entities[entity];
		var promise = new Promise(resolve => {resolve();});
						
		for(var field in ent.fields)
		{
			Func.log(JSON.stringify(value, null, 4));
			Func.log("field " + field + " = " + value.fields[field]);
			//var fieldRow = value.fields[field];
			//if (!fieldRow)
			{
				(function(model, entity, field, client){
					// ZDE ZASE CLOSURE PROBLEM!!!!!!
					promise = promise.then(value => ModelDb.alterField(model, entity, field, client));
				})(model, entity, field, client);				
			}
		}
			
		return promise.then((value) => {
			Func.log("All alter tables resolved for entity " + entity);
		});
	}
	
	static alterField(model, entity, field, client)
	{
		// create field
		var ent = model.entities[entity];
		Func.log("Calling alter table for " + field);
		var field_type = ModelDb.getFieldType(ent.fields[field].type);

		var autogenerated = "";
		if (ent.fields[field].autogenerated == true) 
		{
			field_type = "";
			autogenerated = " SERIAL NOT NULL ";
		}

		var unique = "";
		if (ent.fields[field].unique == true)
		{
			unique = " UNIQUE ";
		} 

		var primaryKey = "";
		if (ent.fields[field].key == true) primaryKey = " PRIMARY KEY ";

		var references = "";
		var refData = ent.fields[field].references;
		if (refData)
		{
			references += " REFERENCES " + refData.table + "(" + refData.field + ")";
			if (refData.onDelete) references += " ON DELETE " + refData.onDelete; 
		}

		var query = "ALTER TABLE " + entity + " ADD COLUMN " + field  + " " + field_type + autogenerated + unique + primaryKey + references;
													
		return Func.query(client, query)
				.catch((value) => { Func.log("Alter table failed for entity " + entity + " at field " + field) })
				.then((value) => {});
	}
	
	static getFieldType(type)
	{
		if (type == "text") return "text";
		if (type == "int") return "integer";
		if (type == "bigint") return "bigint";
	}
};

module.exports.Model_db = ModelDb;