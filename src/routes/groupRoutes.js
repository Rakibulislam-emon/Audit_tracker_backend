import{ Router } from 'express';
import { getAllGroups, getGroupById,createGroup,updateGroup,deleteGroup } from '../controllers/groupController.js';


const router = Router();

// get all groups
router.get('/', getAllGroups);

router.get('/:id', getGroupById);

// create a new group
router.post('/', createGroup);

// update group by id
router.put('/:id', updateGroup);

// delete group by id
router.delete('/:id', deleteGroup);
export default router;
