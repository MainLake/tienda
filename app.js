const express = require('express');
const { Pool } = require('pg');

const app = express();

const PORT = 3000;

const DB = new Pool({
    user: 'raven',
    host: '192.168.1.69',
    database: 'tienda',
    password: 'root',
    port: 5432
});

// Ver productos
app.get('/productos', async (request, response) => {

    try{

        const { rows } = await DB.query('SELECT * FROM productos');

        return response.status(200).json(rows).end();

    }catch(err) {
        return response.status(500).json({
            mensaje: 'A ocurrido un error en el servidor'
        }).end();
    }

});

// Ver producto
app.get('/productos/:id', async (request, response) => {
    const { id } = request.params;

    try {
        const {rows} = await DB.query('SELECT * FROM productos WHERE id = $1', [id]);

        if(rows.length === 0) {
            return response.status(404).json({
                mensaje: 'Producto no encontrado'
            }).end();
        }

        response.status(200).json(rows).end();

    } catch (err) {

        response.status(500).json({
            mensaje: 'A ocurrido un error en el servidor'
        }).end();

    }


});

// comprar producto
app.get('/comprar/:id/:cantidad', async (request, response) => {
    const { id, cantidad } = request.params;

    try {

        // Inicio de la transaccion
        await DB.query('BEGIN');

        // Fase 1: fase de crecimiento, se bloquea la fila del producto
        const { rows } = await DB.query('SELECT * FROM productos WHERE id = $1', [id]);

        if (rows.length == 0) {
            await DB.query('ROLLBACK');
            return response.status(404).json({
                mensaje: "No existe el producto seleccionado"
            }).end();
        }

        const producto = rows[0];

        if (producto.stock === 0 || producto.stock < cantidad) {
            await DB.query('ROLLBACK');
            return response.status(400).json({
                mensaje: 'No hay suficiente stock de productos'
            }).end();
        }

        await DB.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [cantidad, id]);

        // Fase 2: fase de reduccion, confirmamos la transaccion y los cambios se realizan en la bd
        await DB.query('COMMIT');

        return response.status(202).json({
            mensaje: 'Compra realizada con exito!!'
        }).end();

    } catch (err) {
        await DB.query('ROLLBACK');
        return response.status(500).json({
            mensaje: 'Algo a salido mal durante la compra'
        }).end();
    }


});



app.listen(PORT, async () => {
    try {
        await DB.connect();
        console.log('Conexion con base de datos establecida!!');
    } catch (err) {
        console.log(err);
        process.exit(0);
    }
})